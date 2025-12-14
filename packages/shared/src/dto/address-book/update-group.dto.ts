import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAddressGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
