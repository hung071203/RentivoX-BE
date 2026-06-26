import { Transform } from 'class-transformer';

export const ToLowerCase = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  );
