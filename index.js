import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import mysql from 'mysql2/promise';
const port = 6679;
const app = express();
// Configurar la conexión a MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'modeler'
});
// Middleware para habilitar CORS
app.use(cors(
  {
      origin: '*',
      methods: ['GET', 'POST'],
  }
));
const server = createServer(app);

// Ruta de prueba para verificar CORS en Express
app.get('/', (req, res) => {
  res.json({ message: 'CORS works!' });
});
app.get('/messages', async (req, res) => {
  // Obtener el roomId de los parámetros de consulta
  const { room } = req.query;
  const connection = await pool.getConnection();
  const [rows] = await connection.query('SELECT * FROM mensaje WHERE roomId = ?', [room]);
  connection.release();
  res.json(rows);
});

const io = new Server(server, cors(
  {
      origin: '*',
      methods: ['GET', 'POST'],
  }
));
io.on("connection", (socket) => {
  console.log("A user connected");

// Unir a un usuario a una room
socket.on('joinRoom', (room) => {
    console.log(`User joined room: ${room}`);
    socket.join(room);
    });

  //Recibir el mensaje
  socket.on("message", async ({message, idUser, userName}, room) => {
    // Enviar el mensaje a todos los usuarios en la sala
    socket.broadcast.to(room).emit("message", { message, idUser, userName });
    // Guardar el mensaje en la base de datos
    const connection = await pool.getConnection();
        await connection.query('INSERT INTO mensaje (userId, content, roomId, username) VALUES (?, ?, ?, ?)', [idUser, message, room, userName]);
        connection.release();
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
