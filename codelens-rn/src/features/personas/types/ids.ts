import { nanoid } from 'nanoid';

export type PersonaId = string & { readonly __brand: 'PersonaId' };

const makeId = <T extends string>(prefix: string): T => `${prefix}_${nanoid(21)}` as T;

export const newPersonaId = (): PersonaId => makeId<PersonaId>('p');

export const isPersonaId = (value: unknown): value is PersonaId =>
  typeof value === 'string' && /^p_[A-Za-z0-9_-]{21}$/.test(value);

export const unsafePersonaId = (value: string): PersonaId => {
  if (!isPersonaId(value)) {
    throw new Error(`Invalid PersonaId: ${value}`);
  }
  return value;
};
