import { validPriorities, defaultPriorities } from '../../domain/project-priorities';
import { DEFAULT_TASK_TYPES, defaultTaskTypeColors } from '../../domain/default-task-types';
import { InitializationWorkRules } from './InitializationWorkRules';
import { InitializationReview } from './InitializationReview';
import {
  validProjectRuleValues,
  validTaskPrefix,
  validInitializationDirectory,
  type ProjectInitializationDraft,
} from '../../domain/project-initialization';
import { InitializationStorageFields } from './InitializationStorageFields';
import { useLayoutEffect, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import type { OpenProject, WorkModel } from '../../app/types';
import { folderName } from '../../domain/project-paths';
import { initializationTitles } from './InitializationSteps';

export function ProjectInitialization({
  step,
  onStep,
  onCancel,
  project,
  model,
  onInitialize,
  onPickParent,
  busy = false,
  error,
}: {
  step: number;
  onStep: (step: number) => void;
  onCancel?: () => void;
  onPickParent: (parent: string) => Promise<string | null>;
  onInitialize?: (draft: ProjectInitializationDraft) => Promise<void>;
  busy?: boolean;
  error?: string;
  project: OpenProject;
  model: WorkModel | null;
}) {
  const [draft, setDraft] = useState<ProjectInitializationDraft>(() => ({
    name: model?.title ?? folderName(project.path),
    directory: model?.dataDirectory ?? 'docs/worktree',
    prefix: model?.idPrefix ?? 'W',
    useEffort: model?.useEffort ?? false,
    idSeparator: model?.idSeparator ?? 'none',
    dateFormat: model?.dateFormat ?? 'yyyy-MM-dd',
    timeFormat: model?.timeFormat ?? '24h',
    taskTypes: (model?.taskTypes ?? DEFAULT_TASK_TYPES).join(', '),
    taskTypeColors: model?.taskTypeColors ?? defaultTaskTypeColors(),
    labels: model?.commonLabels?.join(', ') ?? '',
    priorities: model?.priorities?.map((p) => ({ ...p })) ?? defaultPriorities(),
    assignees: model?.assignees?.join(', ') ?? '',
  }));
  const change = (values: Partial<ProjectInitializationDraft>) =>
    setDraft((current) => ({ ...current, ...values }));
  const { name, directory, prefix } = draft;
  const form = useRef<HTMLFormElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const nameError =
    !name.trim() || name.length > 200 || /[\r\n\0]/.test(name) ? messages.projectNameRequired : '';
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [step]);
  const validateCurrent = () => {
    setValidationAttempted(true);
    if (!form.current?.checkValidity()) {
      [...(form.current?.querySelectorAll<HTMLInputElement>('input, select, textarea') ?? [])]
        .find((input) => !input.validity.valid)
        ?.focus();
      return false;
    }
    if (step === 0 && nameError) {
      form.current?.querySelector<HTMLInputElement>('#initialization-name')?.focus();
      return false;
    }
    if (
      step === 1 &&
      (!validProjectRuleValues(draft.taskTypes, true) || !validProjectRuleValues(draft.labels))
    ) {
      form.current
        ?.querySelector<HTMLInputElement>(
          !validProjectRuleValues(draft.taskTypes, true)
            ? '#initialization-taskTypes'
            : '#initialization-labels',
        )
        ?.focus();
      return false;
    }
    return true;
  };

  const validStep = () => {
    if (nameError) return 0;
    if (!validInitializationDirectory(directory)) return 0;
    if (!validTaskPrefix(prefix)) return 1;
    if (
      !validProjectRuleValues(draft.taskTypes, true) ||
      !validProjectRuleValues(draft.labels) ||
      !validProjectRuleValues(draft.assignees) ||
      !validPriorities(draft.priorities)
    )
      return 1;
    return 2;
  };
  return (
    <form
      autoComplete="off"
      ref={form}
      noValidate
      onInvalidCapture={(event) => event.preventDefault()}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !onInitialize || !validateCurrent()) return;
        const target = validStep();
        if (target !== initializationTitles().length - 1) {
          onStep(target);
          return;
        }
        if (step !== initializationTitles().length - 1) {
          onStep(step + 1);
          return;
        }
        await onInitialize(draft);
      }}
      className="initialization-preview project-initializer"
      aria-labelledby="initializationStepTitle"
    >
      <div className="initialization-heading">
        <p className="initialization-step-count">
          {step + 1} / {initializationTitles().length}
        </p>
        <h3 id="initializationStepTitle">{initializationTitles()[step]}</h3>
        <p className="initialization-preview-note">
          {onInitialize ? messages.initializeProjectHint : messages.initializationPreviewHint}
        </p>
      </div>
      <div ref={scroll} className="initialization-scroll">
        <fieldset disabled={busy} className="initialization-step-body">
          {step === 0 ? (
            <div className="milestone-editor-fields">
              <label className="task-editor-field">
                <span>{messages.projectName} *</span>
                <input
                  id="initialization-name"
                  required
                  value={name}
                  maxLength={200}
                  aria-invalid={validationAttempted && !!nameError}
                  aria-describedby={
                    validationAttempted && nameError ? 'initialization-name-error' : undefined
                  }
                  onChange={(e) => change({ name: e.target.value })}
                />
                {validationAttempted && nameError ? (
                  <span id="initialization-name-error" role="alert" className="task-editor-error">
                    {nameError}
                  </span>
                ) : null}
              </label>
              <InitializationStorageFields
                root={project.path}
                draft={draft}
                busy={busy}
                onChange={change}
                onPickParent={onPickParent}
              />
            </div>
          ) : step === 1 ? (
            <InitializationWorkRules draft={draft} busy={busy} onChange={change} />
          ) : (
            <InitializationReview draft={draft} root={project.path} />
          )}
        </fieldset>
        {error ? (
          <p role="alert" className="task-editor-error">
            {error}
          </p>
        ) : null}
      </div>
      <div className="initialization-actions">
        {onCancel ? (
          <button id="initializationCancel" disabled={busy} type="button" onClick={onCancel}>
            {messages.initializationCancel}
          </button>
        ) : (
          <span />
        )}
        <div>
          {step > 0 ? (
            <button
              id="initializationPrevious"
              type="button"
              disabled={busy}
              onClick={() => onStep(step - 1)}
            >
              {messages.initializationBack}
            </button>
          ) : null}
          {step < initializationTitles().length - 1 ? (
            <button
              id="initializationNext"
              type="button"
              onClick={() => {
                if (!busy && validateCurrent()) onStep(step + 1);
              }}
            >
              {messages.initializationNext}
            </button>
          ) : (
            <button id="initializationSubmit" type="submit" disabled={busy || !onInitialize}>
              {busy ? messages.initializingProject : messages.initializeProject}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
