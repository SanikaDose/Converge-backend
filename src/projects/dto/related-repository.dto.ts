import { IsNotEmpty, IsString } from "class-validator";

export class RelatedRepositoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;
}