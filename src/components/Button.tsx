import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type Variant = 'primary' | 'secondary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export default function Button({
  variant = 'primary',
  className,
  ...rest
}: Props) {
  const cls = ['pb-button', `pb-button--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  return <button className={cls} {...rest} />
}
