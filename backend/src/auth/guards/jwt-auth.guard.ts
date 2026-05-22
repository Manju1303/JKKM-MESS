import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard that validates JWT Bearer tokens on protected routes */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
