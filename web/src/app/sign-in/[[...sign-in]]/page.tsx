import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-white p-4">
      <SignIn 
        appearance={{
          elements: {
            rootBox: {
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
            },
            card: {
              boxShadow: 'none',
              borderRadius: '0',
            },
            headerTitle: {
              fontSize: '28px',
              fontWeight: '700',
              color: '#00A896',
            },
            headerSubtitle: {
              fontSize: '16px',
              color: '#6b7280',
              marginTop: '8px',
            },
            formFieldLabel: {
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a2e',
              marginBottom: '8px',
            },
            formFieldInput: {
              borderRadius: '12px',
              fontSize: '16px',
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              boxShadow: 'none',
              transition: 'all 0.2s',
            },
            formFieldInput__focus: {
              borderColor: '#00A896',
              boxShadow: '0 0 0 3px rgba(0, 168, 150, 0.1)',
            },
            formFieldAction: {
              marginTop: '16px',
            },
            formButtonPrimary: {
              backgroundColor: '#00A896',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              padding: '14px 24px',
              marginTop: '24px',
            },
            formButtonPrimary__hover: {
              backgroundColor: '#008f7f',
            },
            footerActionLink: {
              color: '#00A896',
              fontWeight: '600',
            },
            dividerLine: {
              borderColor: '#e5e7eb',
            },
            dividerText: {
              color: '#9ca3af',
              fontSize: '14px',
            },
            socialButtonsBlockButton: {
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            },
            identityPreviewText: {
              fontSize: '14px',
              fontWeight: '600',
            },
            identityPreviewEditButton: {
              fontSize: '14px',
              fontWeight: '600',
              color: '#00A896',
            },
          },
        }}
      />
    </div>
  );
}
