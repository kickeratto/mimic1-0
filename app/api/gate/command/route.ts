import ewelink from 'ewelink-api';

export async function POST(request: Request) {
  try {
    const connection = new (ewelink as any)({
      email: process.env.EWELINK_EMAIL,
      password: process.env.EWELINK_PASSWORD,
      region: process.env.EWELINK_REGION || 'us',
    });

    const deviceId = process.env.EWELINK_DEVICE_ID;

    const result = await connection.setDevicePowerState({
      id: deviceId,
      state: 'on',
    });

    return Response.json({ success: true, result });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}