import { Test, TestingModule } from "@nestjs/testing";
import { KitchenService } from "./kitchen.service";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { AppGateway } from "../gateway/app.gateway";
import { BadRequestException } from "@nestjs/common";

describe("KitchenService", () => {
  let service: KitchenService;
  let prismaServiceMock: any;
  let inventoryServiceMock: any;
  let appGatewayMock: any;

  beforeEach(async () => {
    prismaServiceMock = {
      $transaction: jest.fn((cb) => cb(prismaServiceMock)),
      dailyIssue: {
        create: jest.fn(),
      },
      consumptionLog: {
        create: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
      },
      purchaseItem: {
        findMany: jest.fn(),
      },
    };

    inventoryServiceMock = {
      deductStock: jest.fn(),
    };

    appGatewayMock = {
      emitKitchenIssue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: InventoryService, useValue: inventoryServiceMock },
        { provide: AppGateway, useValue: appGatewayMock },
      ],
    }).compile();

    service = module.get<KitchenService>(KitchenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkFefo", () => {
    it("should return matchesFefo=true if one or no active batches exist", async () => {
      prismaServiceMock.inventory.findMany.mockResolvedValue([]);

      const result = await service.checkFefo(1, "BATCH001");
      expect(result).toEqual({ matchesFefo: true });
    });

    it("should return matchesFefo=true if the selected batch is the oldest batch", async () => {
      const activeBatches = [
        {
          id: 1,
          batchNumber: "BATCH001",
          expiryDate: new Date("2026-08-01"),
          quantity: 10,
        },
        {
          id: 2,
          batchNumber: "BATCH002",
          expiryDate: new Date("2026-09-01"),
          quantity: 20,
        },
      ];
      prismaServiceMock.inventory.findMany.mockResolvedValue(activeBatches);

      const result = await service.checkFefo(1, "BATCH001");
      expect(result).toEqual({ matchesFefo: true });
    });

    it("should return warning details if the selected batch is not the oldest expiring batch", async () => {
      const oldestDate = new Date("2026-08-01");
      const newerDate = new Date("2026-09-01");
      const activeBatches = [
        {
          id: 1,
          batchNumber: "BATCH001",
          expiryDate: oldestDate,
          quantity: 10,
        },
        { id: 2, batchNumber: "BATCH002", expiryDate: newerDate, quantity: 20 },
      ];
      prismaServiceMock.inventory.findMany.mockResolvedValue(activeBatches);

      const result = await service.checkFefo(1, "BATCH002");
      expect(result.matchesFefo).toBe(false);
      expect(result.warning).toContain(
        "FEFO Warning: There is an older batch (#BATCH001)",
      );
      expect(result.recommendedBatch).toBe("BATCH001");
    });
  });

  describe("issueStock", () => {
    it("should issue stock successfully if deduction leaves no remaining unfulfilled quantity", async () => {
      const mockIssue = {
        id: 10,
        productId: 1,
        quantity: 5,
        unit: "KG",
        meal: "LUNCH",
        notes: "Test issue",
        product: { name: "Test Product" },
      };
      prismaServiceMock.dailyIssue.create.mockResolvedValue(mockIssue);
      inventoryServiceMock.deductStock.mockResolvedValue({ remaining: 0 });
      prismaServiceMock.consumptionLog.create.mockResolvedValue({ id: 100 });

      const issueData = {
        productId: 1,
        quantity: 5,
        unit: "KG",
        meal: "LUNCH",
        headcount: 50,
        notes: "Test issue",
        issueDate: "2026-07-04",
      };

      const result = await service.issueStock(issueData, 1);
      expect(result).toBeDefined();
      expect(inventoryServiceMock.deductStock).toHaveBeenCalledWith(
        1,
        5,
        "Kitchen issue - LUNCH",
        expect.any(Object),
      );
      expect(appGatewayMock.emitKitchenIssue).toHaveBeenCalled();
    });

    it("should throw BadRequestException if stock is insufficient", async () => {
      const mockIssue = {
        id: 10,
        productId: 1,
        quantity: 5,
        unit: "KG",
        meal: "LUNCH",
        notes: "Test issue",
        product: { name: "Test Product" },
      };
      prismaServiceMock.dailyIssue.create.mockResolvedValue(mockIssue);
      inventoryServiceMock.deductStock.mockResolvedValue({ remaining: 2 }); // 2 units unfulfilled

      const issueData = {
        productId: 1,
        quantity: 5,
        unit: "KG",
        meal: "LUNCH",
        headcount: 50,
        notes: "Test issue",
        issueDate: "2026-07-04",
      };

      await expect(service.issueStock(issueData, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
