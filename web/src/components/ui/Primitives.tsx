import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export const Button = ({ children, variant = 'primary', busy = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; busy?: boolean }) => <button {...props} disabled={props.disabled || busy} className={`button ${variant} ${props.className ?? ''}`} aria-busy={busy}>{busy && <LoaderCircle size={18} className="spin" aria-hidden="true"/>}{children}</button>
export const Field = ({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) => <div className="field"><label htmlFor={id}>{label}</label>{hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}<input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props}/></div>
export const ErrorBox = ({ message }: { message: string }) => message ? <div className="error-box" role="alert">{message}</div> : null
export const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="external-link">{children}<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>
export const EmptyState = ({ title, children }: { title: string; children: ReactNode }) => <div className="empty-state"><h2>{title}</h2><p>{children}</p></div>
