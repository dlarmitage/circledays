import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#faf9f7',
          backgroundImage: 'linear-gradient(135deg, #faf9f7 0%, #e0f2f1 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(251, 113, 133, 0.1)',
          }}
        />
        
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          {/* Emoji row */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '30px',
              fontSize: '60px',
            }}
          >
            <span>🎂</span>
            <span>❤️</span>
            <span>🎆</span>
          </div>
          
          {/* App name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#0d9488',
              marginBottom: '20px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            CircleDays
          </div>
          
          {/* Tagline */}
          <div
            style={{
              fontSize: '36px',
              color: '#374151',
              fontFamily: 'system-ui, sans-serif',
              maxWidth: '800px',
            }}
          >
            Never miss a special day again
          </div>
          
          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              color: '#6b7280',
              marginTop: '20px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Birthdays • Anniversaries • Special Moments
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

