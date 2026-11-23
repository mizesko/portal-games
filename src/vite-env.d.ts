/// <reference types="vite/client" />

// Additional CSS module declarations
declare module '*.css' {
  const content: string
  export default content
}
