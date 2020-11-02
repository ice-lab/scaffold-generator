/* eslint-disable import/no-cycle */
import { init, RematchRootState, RematchDispatch, Models } from '@rematch/core';
import { counter } from './counter';

export interface RootModel extends Models {
  counter: typeof counter;
}

const rootModel: RootModel = { counter };

export const store = init({
  models: rootModel,
});

export type Store = typeof store;
export type Dispatch = RematchDispatch<typeof rootModel>;
export type IRootState = RematchRootState<typeof rootModel>;
