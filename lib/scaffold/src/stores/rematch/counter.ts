import { createModel } from '@rematch/core';
import { Dispatch } from './index';

export type CounterState = number

const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const model = {
  state: 0,
  reducers: {
    increment: (state: CounterState, payload: number): CounterState =>
      state + payload,
  },
  effects: (dispatch: Dispatch) => ({
    async incrementAsync(payload = 1) {
      await delay(1000);
      dispatch.counter.increment(payload);
    },
  }),
};

export const counter: typeof model = createModel(model);