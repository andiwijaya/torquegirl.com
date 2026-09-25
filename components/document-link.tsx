import type { ComponentProps } from 'react';

/** Full document navigation avoids the current Vinext Link runtime failure and
 * gives the local analyzer a fresh document without editorial analytics. */
export default function DocumentLink(props: ComponentProps<'a'>) {
  return <a {...props} />;
}
