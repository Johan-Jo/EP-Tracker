/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { DemoActionBlocker } from '@/components/core/demo-action-blocker';
import { useDemoMode } from '@/lib/demo/demo-context';

jest.mock('@/lib/demo/demo-context');

const mockedUseDemoMode = useDemoMode as jest.MockedFunction<typeof useDemoMode>;

describe('DemoActionBlocker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders children normally when not in demo mode', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'none',
			demoOrgId: null,
			setMode: jest.fn(),
			isDemoMode: false,
		});

		render(
			<DemoActionBlocker>
				<button>Click me</button>
			</DemoActionBlocker>
		);

		const button = screen.getByText('Click me');
		expect(button).toBeInTheDocument();
		expect(button).not.toHaveClass('opacity-50');
		expect(button).not.toHaveClass('pointer-events-none');
	});

	test('disables and shows tooltip when in demo mode', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		render(
			<DemoActionBlocker>
				<button>Click me</button>
			</DemoActionBlocker>
		);

		const wrapper = screen.getByText('Click me').closest('div');
		expect(wrapper).toHaveClass('opacity-50');
		expect(wrapper).toHaveClass('pointer-events-none');
		expect(wrapper).toHaveClass('cursor-not-allowed');
	});

	test('uses custom tooltip text when provided', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		const customText = 'Custom demo message';

		render(
			<DemoActionBlocker action={customText}>
				<button>Click me</button>
			</DemoActionBlocker>
		);

		// Tooltip should contain custom text
		// Note: Tooltip content may not be immediately visible, but should be in DOM
		expect(screen.getByText(customText)).toBeInTheDocument();
	});

	test('uses default tooltip text when action prop not provided', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		render(
			<DemoActionBlocker>
				<button>Click me</button>
			</DemoActionBlocker>
		);

		expect(screen.getByText(/Den här åtgärden är avstängd i demo/i)).toBeInTheDocument();
	});
});

