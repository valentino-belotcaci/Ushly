import {
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};
export function Tabs({ label, items }: { label: string; items: TabItem[] }) {
  const prefix = useId();
  const [selected, setSelected] = useState(
    items.find((item) => !item.disabled)?.id,
  );
  const active =
    items.find((item) => item.id === selected && !item.disabled)?.id ??
    items.find((item) => !item.disabled)?.id;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabled = items
      .map((item, i) => (item.disabled ? -1 : i))
      .filter((i) => i >= 0);
    let target: number | undefined;
    const position = enabled.indexOf(index);
    if (event.key === 'ArrowRight')
      target = enabled[(position + 1) % enabled.length];
    else if (event.key === 'ArrowLeft')
      target = enabled[(position - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') target = enabled[0];
    else if (event.key === 'End') target = enabled.at(-1);
    else return;
    event.preventDefault();
    const item = target === undefined ? undefined : items[target];
    if (item && target !== undefined) {
      setSelected(item.id);
      buttons.current[target]?.focus();
    }
  }
  return (
    <div className="tabs">
      <div role="tablist" aria-label={label} className="tabs__list">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${index}`}
            aria-controls={`${prefix}-panel-${index}`}
            aria-selected={active === item.id}
            disabled={item.disabled}
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => setSelected(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${prefix}-panel-${index}`}
          aria-labelledby={`${prefix}-tab-${index}`}
          hidden={active !== item.id}
          tabIndex={0}
          className="tabs__panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
