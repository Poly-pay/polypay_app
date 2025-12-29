import { IsNotEmpty, IsString } from "class-validator";

export class SendCommitmentDto {
  @IsNotEmpty()
  @IsString()
  recipientCommitment: string;

  @IsNotEmpty()
  @IsString()
  senderCommitment: string;
}
