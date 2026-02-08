import jwt from 'jsonwebtoken';

export function requireAuth(req,res,next){
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if(!token) return res.status(401).json({message:'Unauthorized'});
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  }catch(e){
    return res.status(401).json({message:'Invalid token'});
  }
}
