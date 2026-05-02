// Web stub — no swipe, just shows active screen
import { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

const SwipePager = forwardRef(({ children, style, initialPage, onPageSelected }: any, ref) => {
  useImperativeHandle(ref, () => ({
    setPage: () => {},
  }));
  return <View style={style}>{children}</View>;
});

export default SwipePager;
