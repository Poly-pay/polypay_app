import { Module } from '@nestjs/common';
import { ContactBookController } from './contact-book.controller';
import { DatabaseModule } from '@/database/database.module';
import { ContactBookService } from './contact-book.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContactBookController],
  providers: [ContactBookService],
  exports: [ContactBookService],
})
export class ContactBookModule {}
