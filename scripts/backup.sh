#!/bin/bash
BACKUP_DIR="/opt/jkkm-mess/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="jkkm_mess_erp"
BACKUP_FILE="$BACKUP_DIR/${DATABASE_NAME}_$TIMESTAMP.sql"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Run pg_dump inside the docker container
docker exec -t jkkm-postgres-prod pg_dump -U postgres $DATABASE_NAME > $BACKUP_FILE

# Compress the backup file to save space
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -name "*.gz" -delete

echo "Backup created successfully at ${BACKUP_FILE}.gz"
