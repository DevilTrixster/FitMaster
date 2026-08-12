export class Exercise {
  public readonly id?: number;
  public readonly name: string;
  public readonly description: string;
  public readonly muscleGroup: string;
  public readonly equipmentType: string;

  constructor(data: {
    id?: number;
    name: string;
    description: string;
    muscleGroup: string;
    equipmentType: string;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.muscleGroup = data.muscleGroup;
    this.equipmentType = data.equipmentType;
  }
}