import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class ReorderTasksDto {
  /** The phase's task ids in their new top-to-bottom order. */
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  taskIds: string[];
}
