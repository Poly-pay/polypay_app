import { Module } from '@nestjs/common';
import { ProofJobController } from './proof-job.controller';
import { ProofJobService } from './proof-job.service';

@Module({
  controllers: [ProofJobController],
  providers: [ProofJobService],
  exports: [ProofJobService],
})
export class ProofJobModule {}
