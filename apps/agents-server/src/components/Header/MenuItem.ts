import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Shared menu entry model used by desktop and mobile header navigation.
 *
 * @private internal menu model of <Header/>
 */
export type MenuItem =
    | {
          type: 'link';
          href: string;
          label: ReactNode;
      }
    | {
          type: 'dropdown';
          id: string;
          label: ReactNode;
          items: SubMenuItem[];
          isOpen: boolean;
          setIsOpen: Dispatch<SetStateAction<boolean>>;
          isMobileOpen: boolean;
          setIsMobileOpen: Dispatch<SetStateAction<boolean>>;
          renderMenu?: () => ReactNode;
      };
