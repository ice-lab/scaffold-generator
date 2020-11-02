import React from 'react';
import { connect } from 'react-redux';
import { IRootState, Dispatch } from '@/store';

const mapState = (state: IRootState) => {
  console.log(state);
  return {
    counter: state.counter,
  };
};

const mapDispatch = (dispatch: Dispatch) => ({
  increment: () => dispatch.counter.increment(1),
  incrementAsync: () => dispatch.counter.incrementAsync(1),
});

// eslint-disable-next-line no-undef
type connectedProps = ReturnType<typeof mapState> & ReturnType<typeof mapDispatch>;
type Props = connectedProps;

const Count = (props: Props) => {
  console.log(props);
  return (
    <div style={{ display: 'flex', margin: '20px' }}>
      <div>
        <h3>Rematch 示例</h3>
        <h1>couter：{props.counter}</h1>
        <button onClick={props.increment} type="button">+1</button>
        <button style={{ marginLeft: 10 }} onClick={props.incrementAsync} type="button">+1 async</button>
      </div>
    </div>
  );
};

export default connect(
  mapState,
  mapDispatch,
)(Count);
