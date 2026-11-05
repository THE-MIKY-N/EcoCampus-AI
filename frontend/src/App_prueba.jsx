
import { useEffect, useState } from 'react'

function App_prueba() {
  const [mensaje, setMensaje] = useState('Conectando con Django...')
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/')
      .then((respuesta) => {
        if (!respuesta.ok) {
          throw new Error('Error al conectar con Django')
        }
        return respuesta.json()
      })
      .then((datos) => {
        setMensaje(datos.mensaje)
      })
      .catch(() => {
        setMensaje('No se pudo conectar con Django')
        setError(true)
      })
  }, [])

  return (
    <main style={{
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '60px 20px'
    }}>
      <h1>EcoCampus AI</h1>
      <h2>Conexión entre React y Django</h2>
      <p style={{ color: error ? 'red' : 'green' }}>
        {mensaje}
      </p>
    </main>
  )
}

export default App
