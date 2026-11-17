export function interactionText(template: string, name: string) {
  return template.replace('{{name}}', name);
}
