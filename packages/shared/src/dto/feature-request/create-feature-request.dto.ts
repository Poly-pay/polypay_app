import { IsNotEmpty, IsString } from "class-validator";

export class CreateFeatureRequestDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}
