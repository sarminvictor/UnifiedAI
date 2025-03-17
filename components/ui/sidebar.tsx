'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const sidebarVariants = cva(
    'h-full flex flex-col overflow-hidden transition-all duration-300',
    {
        variants: {
            variant: {
                default: 'bg-white border-r',
                gray: 'bg-gray-100 border-r',
                transparent: 'bg-transparent',
            },
            size: {
                sm: 'w-64',
                default: 'w-72',
                lg: 'w-80',
                full: 'w-full',
            },
            position: {
                left: 'left-0',
                right: 'right-0',
            },
            open: {
                true: 'translate-x-0',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
            position: 'left',
            open: true,
        },
    }
)

export interface SidebarProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
    (
        {
            className,
            variant,
            size,
            position,
            open = true,
            onOpenChange,
            ...props
        },
        ref
    ) => {
        const handleOpenChange = React.useCallback(
            (openState: boolean) => {
                onOpenChange?.(openState)
            },
            [onOpenChange]
        )

        React.useEffect(() => {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && open) {
                    handleOpenChange(false)
                }
            }

            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }, [open, handleOpenChange])

        // Handle mobile closed state
        const closedClass = !open && position === 'left' ? '-translate-x-full' :
            !open && position === 'right' ? 'translate-x-full' : ''

        return (
            <div
                ref={ref}
                className={cn(
                    sidebarVariants({ variant, size, position, open }),
                    closedClass,
                    className
                )}
                {...props}
            />
        )
    }
)
Sidebar.displayName = 'Sidebar'

const SidebarHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('p-4', className)}
        {...props}
    />
))
SidebarHeader.displayName = 'SidebarHeader'

const SidebarContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex-1 overflow-auto p-4', className)}
        {...props}
    />
))
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('p-4', className)}
        {...props}
    />
))
SidebarFooter.displayName = 'SidebarFooter'

const SidebarItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex items-center rounded-md p-2 cursor-pointer transition-colors',
            active
                ? 'bg-gray-300 text-gray-900'
                : 'hover:bg-gray-200 text-gray-700',
            className
        )}
        {...props}
    />
))
SidebarItem.displayName = 'SidebarItem'

const SidebarItemIcon = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('mr-2 h-5 w-5', className)}
        {...props}
    />
))
SidebarItemIcon.displayName = 'SidebarItemIcon'

const SidebarItemText = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex-1 truncate', className)}
        {...props}
    />
))
SidebarItemText.displayName = 'SidebarItemText'

const SidebarSection = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('mb-4', className)}
        {...props}
    />
))
SidebarSection.displayName = 'SidebarSection'

const SidebarSectionTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn('mb-2 text-sm font-medium text-gray-500', className)}
        {...props}
    />
))
SidebarSectionTitle.displayName = 'SidebarSectionTitle'

export {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarItem,
    SidebarItemIcon,
    SidebarItemText,
    SidebarSection,
    SidebarSectionTitle,
} 