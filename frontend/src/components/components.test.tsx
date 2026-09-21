import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Badge } from './Badge';
import { Dialog } from './Dialog';
import { Tabs } from './Tabs';
import { Table } from './Table';
import { Pagination } from './Pagination';
import { ToastProvider } from './ToastProvider';
import { useToast } from './toast-context';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

describe('design-system behavior', () => {
  it('buttons do not submit accidentally and block actions while disabled or busy', async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const submit = vi.fn();
    render(
      <form onSubmit={submit}>
        <Button onClick={click}>Action</Button>
        <Button loading onClick={click}>
          Saving
        </Button>
        <Button disabled onClick={click}>
          Disabled
        </Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Action' }));
    await user.click(screen.getByRole('button', { name: 'Saving' }));
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
  it('inputs connect labels, hints, errors, required and disabled semantics', () => {
    render(
      <>
        <Input
          label="Name"
          hint="Short name"
          error="A name is required"
          required
        />
        <Input label="Other name" disabled />
      </>,
    );
    const field = screen.getByRole('textbox', { name: 'Name' });
    expect(field).toHaveAccessibleDescription('Short name A name is required');
    expect(field).toBeInvalid();
    expect(field).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Other name' })).toBeDisabled();
    expect(field.id).not.toBe(
      screen.getByRole('textbox', { name: 'Other name' }).id,
    );
  });
  it('tabs support arrows, Home/End, wrapping, disabled tabs and linked panels', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        label="Examples"
        items={[
          { id: 'a', label: 'First', content: 'First panel' },
          {
            id: 'b',
            label: 'Disabled tab',
            disabled: true,
            content: 'Unavailable',
          },
          { id: 'c', label: 'Last', content: 'Last panel' },
        ]}
      />,
    );
    const first = screen.getByRole('tab', { name: 'First' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Last' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Last');
    await user.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Last' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Last' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Disabled tab' })).toBeDisabled();
  });
  it('pagination bounds navigation and keeps controls constant for large totals', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const view = render(
      <Pagination page={1} pageCount={10000} onPageChange={change} />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(change).toHaveBeenCalledWith(2);
    view.rerender(
      <Pagination page={10000} pageCount={10000} onPageChange={change} />,
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    view.rerender(<Pagination page={0} pageCount={0} onPageChange={change} />);
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
  it('dialogs connect their title and description and request closure on Escape', async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    render(
      <Dialog
        open
        title="Example dialog"
        description="Dialog context"
        onClose={close}
      >
        <p>Contents</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Example dialog' });
    expect(dialog).toHaveAccessibleDescription('Dialog context');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(close).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(close).toHaveBeenCalledTimes(2);
  });
  it('table headers, captions, status text and card headings retain their semantics', () => {
    render(
      <Card title="Examples">
        <Table caption="Reference">
          <thead>
            <tr>
              <th scope="col">Component</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Badge tone="success">Ready</Badge>
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>,
    );
    expect(
      screen.getByRole('region', { name: 'Examples' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reference' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(
      screen.getByRole('columnheader', { name: 'Component' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
  it('loading and errors announce meaningful text and expose retry actions', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <LoadingState label="Loading examples" />
        <ErrorState
          title="Cannot load"
          message="Try once more."
          onRetry={retry}
        />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading examples');
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('toasts announce new messages, stay visible and can be dismissed', async () => {
    function Trigger() {
      const notify = useToast();
      const [count, setCount] = useState(0);
      return (
        <Button
          onClick={() => {
            notify(`Message ${count}`, 'success');
            setCount(count + 1);
          }}
        >
          Notify
        </Button>
      );
    }
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByRole('status')).toHaveTextContent('Message 0');
    await user.click(
      screen.getByRole('button', { name: 'Dismiss notification: Message 0' }),
    );
    expect(screen.queryByText('Message 0')).not.toBeInTheDocument();
    for (let i = 0; i < 7; i++)
      await user.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
