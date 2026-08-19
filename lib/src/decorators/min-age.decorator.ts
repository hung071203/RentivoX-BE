import { applyDecorators } from '@nestjs/common';
import {
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'minAge16', async: false })
export class MinAge16Constraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return true;
    const min = new Date();
    min.setFullYear(min.getFullYear() - 16);
    return new Date(value) <= min;
  }

  defaultMessage() {
    return 'Phải từ 16 tuổi trở lên';
  }
}

export const MinAge16 = () => applyDecorators(Validate(MinAge16Constraint));
