import { useEffect, useState } from 'react';
import { isNarrowViewport } from '../utils/viewport';

/**
 * 「窄屏容器」标志，随 resize 更新。
 *
 * 判据在 `utils/viewport.isNarrowViewport`（唯一出口），这里只是 React 适配层——
 * 4 个页面各自 hand-write 一份 `useState + resize 监听` 是这次收口前的状态，
 * 也正是那 6 份重复里混进了 `<= 768` 这个与 antd `md` 相反的口径。
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(isNarrowViewport);
  useEffect(() => {
    const onResize = () => setNarrow(isNarrowViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return narrow;
}

export default useNarrowViewport;
