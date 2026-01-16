const sessionConfig = {
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
};

export { sessionConfig };
