import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import {
  clonePersona,
  createUserPersona,
  deleteUserPersona,
  getPersonaById,
  getPersonas,
  setChatPersona,
  updateUserPersona,
} from '../data/personaRepo';
import { BUILT_IN_PERSONAS } from '../data/seedBuiltInPersonas';
import { unsafePersonaId, type PersonaId } from '../types/ids';
import type { ChatId } from '../../../domain/types';

type Row = {
  id: string;
  name: string;
  description: string;
  systemPromptLayer: string;
  iconEmoji: string | null;
  isBuiltIn: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

function rowFrom(persona: Row): Row {
  return { ...persona };
}

interface Capture {
  selectRows: Row[];
  insertedValues: Record<string, unknown> | null;
  updatedSet: Record<string, unknown> | null;
  deletedWhere: boolean;
  selectOrderArgs: unknown[] | null;
  updatedWhere: unknown;
  deletedWhereArg: unknown;
  whereArg: unknown;
}

function makeExecutor(initial: Row[] = []): { executor: object; capture: Capture } {
  const capture: Capture = {
    selectRows: initial,
    insertedValues: null,
    updatedSet: null,
    deletedWhere: false,
    selectOrderArgs: null,
    updatedWhere: null,
    deletedWhereArg: null,
    whereArg: null,
  };

  const executor = {
    select: () => ({
      from: () => ({
        where: (arg: unknown) => {
          capture.whereArg = arg;
          return Promise.resolve(capture.selectRows);
        },
        orderBy: (...args: unknown[]) => {
          capture.selectOrderArgs = args;
          return Promise.resolve(capture.selectRows);
        },
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        capture.insertedValues = values;
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        capture.updatedSet = values;
        return {
          where: (arg: unknown) => {
            capture.updatedWhere = arg;
            return Promise.resolve();
          },
        };
      },
    }),
    delete: () => ({
      where: (arg: unknown) => {
        capture.deletedWhere = true;
        capture.deletedWhereArg = arg;
        return Promise.resolve();
      },
    }),
  };

  return { executor, capture };
}

const builtInRow = rowFrom({
  ...BUILT_IN_PERSONAS[0]!,
});

const userRow: Row = {
  id: 'p_user1234567890123456a',
  name: 'My Persona',
  description: 'User-defined.',
  systemPromptLayer: 'Be concise.',
  iconEmoji: null,
  isBuiltIn: false,
  sortOrder: 100,
  createdAt: 100,
  updatedAt: 100,
};

describe('personaRepo guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orders personas built-ins first, then sortOrder, createdAt, name', async () => {
    const { executor, capture } = makeExecutor([builtInRow, userRow]);
    const result = await getPersonas(executor as never);

    expect(result.map((p) => p.id)).toEqual([builtInRow.id, userRow.id]);
    expect(capture.selectOrderArgs).not.toBeNull();
    expect(capture.selectOrderArgs!.length).toBe(4);
  });

  it('returns undefined when getPersonaById finds no row', async () => {
    const { executor } = makeExecutor([]);
    const result = await getPersonaById(unsafePersonaId('p_missing12345678901234'), executor as never);
    expect(result).toBeUndefined();
  });

  it('createUserPersona inserts a non-built-in row with a new branded id', async () => {
    const { executor, capture } = makeExecutor([]);
    await createUserPersona(
      {
        name: 'Fresh',
        description: 'Custom focus.',
        systemPromptLayer: 'Stay short.',
      },
      42,
      executor as never,
    );

    expect(capture.insertedValues).not.toBeNull();
    expect(capture.insertedValues!.isBuiltIn).toBe(false);
    expect(capture.insertedValues!.sortOrder).toBe(100);
    expect(capture.insertedValues!.createdAt).toBe(42);
    expect(typeof capture.insertedValues!.id).toBe('string');
    expect((capture.insertedValues!.id as string).startsWith('p_')).toBe(true);
  });

  it('updateUserPersona refuses to edit a built-in persona', async () => {
    const { executor } = makeExecutor([builtInRow]);
    await expect(
      updateUserPersona(
        builtInRow.id as PersonaId,
        {
          name: 'Hijack',
          description: 'Changed.',
          systemPromptLayer: 'Different.',
        },
        100,
        executor as never,
      ),
    ).rejects.toThrow(/Built-in personas cannot be edited/);
  });

  it('updateUserPersona writes through for a user-defined persona', async () => {
    const { executor, capture } = makeExecutor([userRow]);
    await updateUserPersona(
      userRow.id as PersonaId,
      {
        name: 'Renamed',
        description: 'Updated.',
        systemPromptLayer: 'Be brief.',
      },
      999,
      executor as never,
    );
    expect(capture.updatedSet).not.toBeNull();
    expect(capture.updatedSet!.name).toBe('Renamed');
    expect(capture.updatedSet!.updatedAt).toBe(999);
  });

  it('deleteUserPersona refuses to delete a built-in persona', async () => {
    const { executor, capture } = makeExecutor([builtInRow]);
    await expect(
      deleteUserPersona(builtInRow.id as PersonaId, executor as never),
    ).rejects.toThrow(/Built-in personas cannot be deleted/);
    expect(capture.deletedWhere).toBe(false);
  });

  it('deleteUserPersona deletes a user-defined persona', async () => {
    const { executor, capture } = makeExecutor([userRow]);
    await deleteUserPersona(userRow.id as PersonaId, executor as never);
    expect(capture.deletedWhere).toBe(true);
  });

  it('clonePersona creates a fresh user-defined row from a built-in source', async () => {
    const { executor, capture } = makeExecutor([builtInRow]);
    await clonePersona(builtInRow.id as PersonaId, 'My Deep Diver', 7, executor as never);

    expect(capture.insertedValues).not.toBeNull();
    expect(capture.insertedValues!.name).toBe('My Deep Diver');
    expect(capture.insertedValues!.systemPromptLayer).toBe(builtInRow.systemPromptLayer);
    expect(capture.insertedValues!.isBuiltIn).toBe(false);
    expect((capture.insertedValues!.id as string)).not.toBe(builtInRow.id);
  });

  it('setChatPersona writes the personaId column with an updatedAt timestamp', async () => {
    const { executor, capture } = makeExecutor();
    await setChatPersona('chat_1' as ChatId, userRow.id as PersonaId, executor as never);

    expect(capture.updatedSet).not.toBeNull();
    expect(capture.updatedSet!.personaId).toBe(userRow.id);
    expect(typeof capture.updatedSet!.updatedAt).toBe('string');
  });

  it('setChatPersona accepts null to clear the chat persona', async () => {
    const { executor, capture } = makeExecutor();
    await setChatPersona('chat_2' as ChatId, null, executor as never);
    expect(capture.updatedSet!.personaId).toBeNull();
  });
});
