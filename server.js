const express = require('express'); 
const cors = require('cors'); 
const { db, initializeDatabase } = require('./database'); 
// Crear la aplicación Express 
const app = express(); 
const PORT = process.env.PORT || 3000; 
// Middleware 
app.use(cors()); // Permitir peticiones desde otros dominios 
app.use(express.json()); // Permitir recibir JSON en las peticiones 
// Middleware para logging (registrar todas las peticiones) 
app.use((req, res, next) => { 
console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`); 
next(); 
}); 
// RUTAS DE AUTENTICACIÓN 
// Registro de usuarios 
app.post('/api/register', (req, res) => { 
    const { username, password } = req.body; 
     
    // Validación básica 
    if (!username || !password) { 
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' }); 
    } 
     
    // VULNERABILIDAD DELIBERADA: SQL Injection 
    // En una aplicación real, NUNCA hagas esto 
    const query = `INSERT INTO users (username, password) VALUES ('${username}', 
'${password}')`; 
     
    db.run(query, function(err) { 
        if (err) { 
            // VULNERABILIDAD DELIBERADA: Exposición de información sensible 
            console.error('Error en registro:', err); 
            return res.status(500).json({  
                error: 'Error al registrar usuario', 
                details: err.message,  // ¡Esto expone información sensible! 
                query: query          // ¡Esto también! 
            }); 
        } 
         
        res.status(201).json({  
            message: 'Usuario registrado exitosamente', 
            userId: this.lastID  
        }); 
    }); 
}); 
 
// Login de usuarios 
app.post('/api/login', (req, res) => { 
    const { username, password } = req.body; 
     
    if (!username || !password) { 
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' }); 
    } 
     
    // VULNERABILIDAD DELIBERADA: SQL Injection 
    // Un atacante podría usar: admin' OR '1'='1' -- 
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = 
'${password}'`; 
     
    db.get(query, (err, user) => { 
        if (err) { 
            console.error('Error en login:', err); 
            return res.status(500).json({  
                error: 'Error en el servidor', 
                details: err.message, 
                query: query 
            }); 
        } 
         
        if (!user) { 
            return res.status(401).json({ error: 'Credenciales inválidas' }); 
        } 
         
        // VULNERABILIDAD DELIBERADA: Exposición de contraseña 
        res.json({  
            message: 'Login exitoso', 
            user: { 
                id: user.id, 
                username: user.username, 
                password: user.password  // ¡Nunca devuelvas la contraseña! 
            } 
        }); 
    }); 
}); 
 
// RUTAS DE TAREAS 
 
// Obtener tareas del usuario 
app.get('/api/tasks', (req, res) => { 
    const { user_id } = req.query; 
     
    if (!user_id) { 
        return res.status(400).json({ error: 'user_id es requerido' }); 
    } 
     
    // VULNERABILIDAD DELIBERADA: IDOR (Insecure Direct Object Reference) 
    // No verificamos si el usuario actual puede ver estas tareas 
    const query = `SELECT * FROM tasks WHERE user_id = ${user_id} ORDER BY created_at 
DESC`; 
     
    db.all(query, (err, tasks) => { 
        if (err) { 
            console.error('Error obteniendo tareas:', err); 
            return res.status(500).json({  
                error: 'Error al obtener tareas', 
                details: err.message, 
                query: query 
            }); 
        } 
         
        res.json({ tasks }); 
    }); 
}); 
 
// Crear nueva tarea 
app.post('/api/tasks', (req, res) => { 
    const { title, description, user_id } = req.body; 
     
    if (!title || !user_id) { 
        return res.status(400).json({ error: 'Título y user_id son requeridos' }); 
    } 
     
    // VULNERABILIDAD DELIBERADA: SQL Injection 
    const query = `INSERT INTO tasks (title, description, user_id) VALUES ('${title}', 
'${description || ''}', ${user_id})`; 
     
    db.run(query, function(err) { 
        if (err) { 
            console.error('Error creando tarea:', err); 
            return res.status(500).json({  
                error: 'Error al crear tarea', 
                details: err.message, 
                query: query 
            }); 
        } 
         
        res.status(201).json({  
            message: 'Tarea creada exitosamente', 
            taskId: this.lastID  
        }); 
    }); 
}); 
 
// Actualizar tarea 
app.put('/api/tasks/:id', (req, res) => { 
    const taskId = req.params.id; 
    const { completed } = req.body; 
     
    // VULNERABILIDAD DELIBERADA: IDOR 
    // No verificamos si el usuario actual puede modificar esta tarea 
    const query = `UPDATE tasks SET completed = ${completed ? 1 : 0} WHERE id = ${taskId}`; 
     
    db.run(query, function(err) { 
        if (err) { 
            console.error('Error actualizando tarea:', err); 
            return res.status(500).json({  
                error: 'Error al actualizar tarea', 
                details: err.message, 
                query: query 
            }); 
        } 
         
        if (this.changes === 0) { 
            return res.status(404).json({ error: 'Tarea no encontrada' }); 
        } 
         
        res.json({ message: 'Tarea actualizada exitosamente' }); 
    }); 
}); 
 
// Eliminar tarea 
app.delete('/api/tasks/:id', (req, res) => { 
    const taskId = req.params.id; 
     
    // VULNERABILIDAD DELIBERADA: IDOR 
    // No verificamos si el usuario actual puede eliminar esta tarea 
    const query = `DELETE FROM tasks WHERE id = ${taskId}`; 
     
    db.run(query, function(err) { 
        if (err) { 
            console.error('Error eliminando tarea:', err); 
            return res.status(500).json({  
                error: 'Error al eliminar tarea', 
                details: err.message, 
                query: query 
            }); 
        } 
         
        if (this.changes === 0) { 
            return res.status(404).json({ error: 'Tarea no encontrada' }); 
        } 
         
        res.json({ message: 'Tarea eliminada exitosamente' }); 
    }); 
}); 
 
// Middleware de manejo de errores global 
app.use((error, req, res, next) => { 
    console.error('Error no manejado:', error); 
     
    // VULNERABILIDAD DELIBERADA: Exposición de stack trace 
    res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error.message, 
        stack: error.stack,  // ¡Nunca expongas el stack trace! 
        timestamp: new Date().toISOString() 
    }); 
}); 
 
// Inicializar base de datos y arrancar servidor 
async function startServer() { 
    try { 
        await initializeDatabase(); 
         
        app.listen(PORT, () => { 
            console.log(`Servidor corriendo en http://localhost:${PORT}`); 
            console.log('¡Aplicación lista para usar!'); 
        }); 
    } catch (error) { 
        console.error('Error iniciando el servidor:', error); 
        process.exit(1); 
    } 
} 
 
startServer();