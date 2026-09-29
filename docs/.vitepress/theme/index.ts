import { onMounted, onUnmounted } from 'vue'
import { onContentUpdated } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

const storageKey = 'mevn-orm:package-manager'
const managers: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun']

function packageManagerGroup(element: Element): element is HTMLElement {
  const labels = Array.from(element.querySelectorAll<HTMLLabelElement>(':scope > .tabs > label'))
  return labels.length === managers.length
    && labels.every((label) => managers.includes(label.dataset.title as PackageManager))
}

function selectPackageManager(group: HTMLElement, manager: PackageManager): void {
  const labels = Array.from(group.querySelectorAll<HTMLLabelElement>(':scope > .tabs > label'))
  const index = labels.findIndex((label) => label.dataset.title === manager)
  if (index < 0) return

  const input = group.querySelectorAll<HTMLInputElement>(':scope > .tabs > input')[index]
  if (input) input.checked = true

  const blocks = group.querySelector<HTMLElement>(':scope > .blocks')
  Array.from(blocks?.children ?? []).forEach((block, blockIndex) => {
    block.classList.toggle('active', blockIndex === index)
  })
}

function selectAll(manager: PackageManager): void {
  document.querySelectorAll('.vp-code-group').forEach((group) => {
    if (packageManagerGroup(group)) selectPackageManager(group, manager)
  })
}

function savedPackageManager(): PackageManager | undefined {
  try {
    const value = localStorage.getItem(storageKey)
    return managers.find((manager) => manager === value)
  } catch {
    return undefined
  }
}

function restorePackageManager(): void {
  if (typeof window === 'undefined') return
  const manager = savedPackageManager()
  if (manager) selectAll(manager)
}

function onTabClick(event: MouseEvent): void {
  if (!(event.target instanceof HTMLInputElement)) return
  const group = event.target.closest('.vp-code-group')
  if (!group || !packageManagerGroup(group)) return

  const label = group.querySelector<HTMLLabelElement>(`label[for="${event.target.id}"]`)
  const manager = managers.find((candidate) => candidate === label?.dataset.title)
  if (!manager) return

  try {
    localStorage.setItem(storageKey, manager)
  } catch {
    // Tabs still work when storage is unavailable.
  }
  selectAll(manager)
}

export default {
  extends: DefaultTheme,
  setup() {
    onMounted(() => {
      restorePackageManager()
      window.addEventListener('click', onTabClick)
    })
    onUnmounted(() => window.removeEventListener('click', onTabClick))
    onContentUpdated(restorePackageManager)
  },
}
