import React from 'react';
import { ResponsiveGrid } from '@alifd/next';
import BlockA from './components/BlockA';
import BlockB from 'test';

const { Cell } = ResponsiveGrid;
const main = () => {
  return (
    <ResponsiveGrid gap={0}>
      <Cell colSpan={12}>
        <BlockA />
      </Cell>
      <Cell colSpan={12}>
        <BlockB />
      </Cell>
    </ResponsiveGrid>
  );
};

export default main;
