import ewelink from 'ewelink-api';

export async function POST(request) {
  try {
    const connection = new ewelink({
      email: 'TU_CORREO_DE_EWELINK',       // Reemplaza por tu correo de la app eWeLink
      password: 'TU_CONTRASEÑA_DE_EWELINK', // Reemplaza por tu contraseña de eWeLink
      region: 'us',                        // 'us' es la región predeterminada para México/América
    });

    // ID de tu dispositivo eWeLink (Device6a23b1)
    const deviceId = '1000a23b1';          // Reemplaza con el Device ID exacto (lo ves en la app o web de eWeLink)

    // Envía la orden de encendido/pulso al portón
    const result = await connection.setDevicePowerState(deviceId, 'on');

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}