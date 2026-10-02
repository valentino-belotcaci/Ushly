import { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Dialog } from '../components/Dialog';
import { Tabs } from '../components/Tabs';
import { Table } from '../components/Table';
import { Pagination } from '../components/Pagination';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../components/toast-context';
import './preview.css';

export default function ComponentPreview() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const notify = useToast();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to components
      </a>
      <header className="preview-topbar">
        <div className="preview-topbar__brand">
          <BrandLogo />
          <span className="preview-topbar__label">Design system</span>
        </div>
        <div className="row">
          <Badge>Foundation · 0.1</Badge>
          <ThemeToggle />
        </div>
      </header>
      <div className="preview-layout">
        <aside className="preview-sidebar">
          <p>Component library</p>
          <nav aria-label="Component sections">
            <a href="#foundations">Foundations</a>
            <a href="#buttons">Buttons & inputs</a>
            <a href="#navigation">Navigation</a>
            <a href="#feedback">Feedback</a>
            <a href="#overlays">Overlays</a>
            <a href="#tables">Tables</a>
          </nav>
        </aside>
        <main className="preview-main" id="main" tabIndex={-1}>
          <div className="preview-intro">
            <p className="preview-eyebrow">Ushly / Interface foundations</p>
            <h1>Simple pieces. Consistent interfaces.</h1>
            <p>
              A small, accessible set of building blocks for Ushly. Designed to
              feel clear, work with a keyboard, and adapt to every screen.
            </p>
          </div>
          <div className="preview-grid">
            <div id="foundations" className="preview-wide preview-anchor">
              <Card
                title="Color & surface"
                description="A warm accent, quiet surfaces, and readable semantic colors."
              >
                <div className="swatches">
                  {[
                    ['Primary', '--brand', '#FF7A00'],
                    ['Canvas', '--background', 'Background'],
                    ['Surface', '--surface', 'Surface'],
                    ['Success', '--success-ink', 'Positive'],
                    ['Warning', '--warning-ink', 'Attention'],
                    ['Error', '--danger-ink', 'Critical'],
                  ].map(([name, token, value]) => (
                    <div key={name}>
                      <div
                        className="swatch__color"
                        style={{ background: `var(${token})` }}
                      />
                      <p className="swatch__name">{name}</p>
                      <p className="swatch__value">{value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div id="buttons" className="preview-anchor">
              <Card
                title="Buttons"
                description="Clear hierarchy. 12px corners. Comfortable touch targets."
              >
                <div className="stack">
                  <p className="preview-label">Actions</p>
                  <div className="row">
                    <Button
                      onClick={() =>
                        notify('Primary action selected.', 'success')
                      }
                    >
                      Primary action
                    </Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="quiet">Quiet action</Button>
                  </div>
                  <p className="preview-label">States</p>
                  <div className="row">
                    <Button loading>Saving…</Button>
                    <Button disabled>Disabled</Button>
                    <Button variant="danger">Destructive</Button>
                  </div>
                </div>
              </Card>
            </div>
            <Card
              title="Inputs"
              description="Persistent labels, useful hints, and explicit errors."
            >
              <div className="stack">
                <Input
                  label="Display name"
                  placeholder="Enter a name"
                  hint="Use a name that is easy to recognize."
                />
                <Input
                  label="Example field with error"
                  defaultValue=""
                  placeholder="Required value"
                  error="Enter a value to continue."
                  required
                />
              </div>
            </Card>
            <Card
              title="Typography"
              description="Plus Jakarta Sans · locally hosted · variable weight"
            >
              <div className="preview-type">
                <span className="preview-type-title">Clarity comes first.</span>
                <small>Heading / 24</small>
              </div>
              <div className="preview-type">
                <span>Readable at every size.</span>
                <small>Body / 15</small>
              </div>
              <div className="preview-type">
                <span className="preview-note">
                  A little context goes a long way.
                </span>
                <small>Supporting / 13</small>
              </div>
            </Card>
            <div id="navigation" className="preview-anchor">
              <Card
                title="Tabs"
                description="Arrow keys move between tabs. Home and End jump to the edges."
              >
                <Tabs
                  label="Component examples"
                  items={[
                    {
                      id: 'overview',
                      label: 'Overview',
                      content: (
                        <p>
                          One panel at a time keeps related content easy to
                          explore.
                        </p>
                      ),
                    },
                    {
                      id: 'details',
                      label: 'Details',
                      content: (
                        <p>
                          Tab selection follows keyboard focus. Each panel has a
                          connected label.
                        </p>
                      ),
                    },
                    {
                      id: 'unavailable',
                      label: 'Unavailable',
                      disabled: true,
                      content: null,
                    },
                  ]}
                />
              </Card>
            </div>
            <div id="feedback" className="preview-anchor">
              <Card
                title="Status & feedback"
                description="Meaning is expressed with text, as well as color."
              >
                <div className="stack">
                  <div className="row">
                    <Badge>Neutral</Badge>
                    <Badge tone="success">Success</Badge>
                    <Badge tone="warning">Attention</Badge>
                    <Badge tone="danger">Error</Badge>
                  </div>
                  <LoadingState label="Loading content…" />
                  <ErrorState
                    title="Content is unavailable"
                    message="This is an example error state. You can retry the action."
                    onRetry={() =>
                      notify('Retry requested. This is a component example.')
                    }
                  />
                </div>
              </Card>
            </div>
            <div id="overlays" className="preview-anchor">
              <Card
                title="Dialogs & notifications"
                description="Focused decisions and feedback that stays long enough to read."
              >
                <div className="stack">
                  <p className="preview-note">
                    Dialogs keep focus inside until dismissed. Notifications can
                    be closed whenever you are ready.
                  </p>
                  <div className="row">
                    <Button
                      variant="secondary"
                      onClick={() => setDialogOpen(true)}
                    >
                      Open example dialog
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() =>
                        notify(
                          'Your preferences were saved. Example notification.',
                          'success',
                        )
                      }
                    >
                      Show notification
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div id="tables" className="preview-wide preview-anchor">
              <Card
                title="Tables & pagination"
                description="Native table structure, a labeled scroll region, and bounded navigation."
              >
                <div className="stack">
                  <Table caption="Component reference">
                    <thead>
                      <tr>
                        <th scope="col">Component</th>
                        <th scope="col">Purpose</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(page === 1
                        ? [
                            ['Button', 'Primary and supporting actions'],
                            ['Input', 'Labeled data entry'],
                            ['Dialog', 'Focused interactions'],
                          ]
                        : [
                            ['Tabs', 'Related content'],
                            ['Table', 'Structured information'],
                            ['Toast', 'Action feedback'],
                          ]
                      ).map(([name, purpose]) => (
                        <tr key={name}>
                          <th scope="row">{name}</th>
                          <td>{purpose}</td>
                          <td>
                            <Badge tone="success">Ready</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Pagination
                    page={page}
                    pageCount={2}
                    onPageChange={setPage}
                  />
                </div>
              </Card>
            </div>
          </div>
          <p className="preview-footer">
            Development preview only · No product data or backend requests ·
            Keyboard and reduced-motion friendly
          </p>
        </main>
      </div>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="A focused conversation"
        description="This native dialog keeps keyboard focus inside and returns it to the trigger when closed."
      >
        <div className="stack">
          <Input label="Example note" placeholder="Add a short note" />
          <div className="row">
            <Button
              onClick={() => {
                setDialogOpen(false);
                notify('Example confirmed.', 'success');
              }}
            >
              Confirm example
            </Button>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
