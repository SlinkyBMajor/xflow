import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#161b22] group-[.toaster]:text-[#e6edf3] group-[.toaster]:border-[#30363d] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#8b949e]",
          actionButton:
            "group-[.toast]:bg-[#238636] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#21262d] group-[.toast]:text-[#8b949e]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
