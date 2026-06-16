import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'minAge18', async: false })
export class MinAge18Constraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return true;
    const min = new Date();
    min.setFullYear(min.getFullYear() - 18);
    return new Date(value) <= min;
  }

  defaultMessage() {
    return 'Người dùng phải từ 18 tuổi trở lên';
  }
}
