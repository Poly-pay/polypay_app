import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateFeatureRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;
}
