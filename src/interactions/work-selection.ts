export function markSelectedWork(root: ParentNode | null, id: string | null) {
  for (const element of root?.querySelectorAll?.<HTMLElement>(
    '[data-id],[data-select],[data-work-id]',
  ) || []) {
    const selected =
      Boolean(id) &&
      (element.dataset.id || element.dataset.select || element.dataset.workId) === id;
    element.classList.toggle('detail-selected', selected);
    element.setAttribute('aria-current', selected ? 'true' : 'false');
  }
}
