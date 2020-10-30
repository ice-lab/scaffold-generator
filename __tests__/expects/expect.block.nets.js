import React from 'react';
import { ResponsiveGrid } from '@alifd/next';
import BlockA from './components/BlockA';
import BlockB from './components/BlockB';
import BlockC from './components/BlockC';

const { Cell } = ResponsiveGrid;
const main = () => {
  return (
    <ResponsiveGrid gap={20}>
      <Cell colSpan={12}>
        <BlockA />
      </Cell>
      <Cell colSpan={6}>
        <BlockB />
      </Cell>
      <Cell colSpan={6}>
        <BlockC />
      </Cell>
    </ResponsiveGrid>
  );
};

export default main;
