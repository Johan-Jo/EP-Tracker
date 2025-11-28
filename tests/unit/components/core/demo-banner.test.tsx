/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DemoBanner } from '@/components/core/demo-banner';
import { useDemoMode } from '@/lib/demo/demo-context';

jest.mock('@/lib/demo/demo-context');
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		refresh: jest.fn(),
	}),
}));
jest.mock('next/link', () => {
	return ({ children, href }: { children: React.ReactNode; href: string }) => {
		return <a href={href}>{children}</a>;
	};
});

const mockedUseDemoMode = useDemoMode as jest.MockedFunction<typeof useDemoMode>;

describe('DemoBanner', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('does not render when mode is none', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'none',
			demoOrgId: null,
			setMode: jest.fn(),
			isDemoMode: false,
		});

		const { container } = render(<DemoBanner />);
		expect(container.firstChild).toBeNull();
	});

	test('renders anonymous demo banner', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		render(<DemoBanner />);

		expect(screen.getByText(/Du använder nu demo-läge/i)).toBeInTheDocument();
		expect(screen.getByText(/Redo att prova med dina egna projekt/i)).toBeInTheDocument();
	});

	test('renders example mode banner', () => {
		const mockSetMode = jest.fn();
		mockedUseDemoMode.mockReturnValue({
			mode: 'exampleOrg',
			demoOrgId: 'demo-org-123',
			setMode: mockSetMode,
			isDemoMode: true,
		});

		render(<DemoBanner />);

		expect(screen.getByText(/Du visar exempeldata/i)).toBeInTheDocument();
		expect(screen.getByText(/Tillbaka till mitt konto/i)).toBeInTheDocument();
	});

	test('dismisses banner when close button is clicked', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		render(<DemoBanner />);
		
		// Banner should be visible
		expect(screen.getByText(/Du använder nu demo-läge/i)).toBeInTheDocument();

		// Click close button
		const closeButton = screen.getByLabelText('Stäng');
		fireEvent.click(closeButton);

		// Banner should be hidden (dismissed state)
		expect(screen.queryByText(/Du använder nu demo-läge/i)).not.toBeInTheDocument();
	});

	test('signup link navigates to /sign-up', () => {
		mockedUseDemoMode.mockReturnValue({
			mode: 'anonymous',
			demoOrgId: 'demo-org-123',
			setMode: jest.fn(),
			isDemoMode: true,
		});

		render(<DemoBanner />);

		const signupLink = screen.getByText(/Redo att prova med dina egna projekt/i).closest('a');
		expect(signupLink).toHaveAttribute('href', '/sign-up');
	});

	test('calls setMode when "Tillbaka till mitt konto" is clicked', () => {
		const mockSetMode = jest.fn();
		mockedUseDemoMode.mockReturnValue({
			mode: 'exampleOrg',
			demoOrgId: 'demo-org-123',
			setMode: mockSetMode,
			isDemoMode: true,
		});

		render(<DemoBanner />);

		const backButton = screen.getByText(/Tillbaka till mitt konto/i);
		fireEvent.click(backButton);

		expect(mockSetMode).toHaveBeenCalledWith('none');
	});
});

