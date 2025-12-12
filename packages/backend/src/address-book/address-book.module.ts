import { Module } from '@nestjs/common';
import { AddressBookController } from './address-book.controller';
import { AddressBookService } from './address-book.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AddressBookController],
  providers: [AddressBookService],
  exports: [AddressBookService],
})
export class AddressBookModule {}