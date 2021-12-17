import { useState, useEffect } from 'react';
import './Auth.css';
import {auth, firebaseBuffer, firestore} from '../../helpers/firebase';
import {signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, GithubAuthProvider} from 'firebase/auth';
import {setDoc, doc, getDoc, Timestamp} from 'firebase/firestore';
function Auth(props : any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [needRegister, setNeedRegister] = useState(false);

    const SignIn = () => {
        
        signInWithEmailAndPassword(auth, email, password)
        .then(res => {
        }).catch(e => {
            alert(e)
        })

    };
    const signInGitHub = async () => {
        const provider = new GithubAuthProvider();

        signInWithPopup(auth, provider).then(async (res) => {
            let userRef = doc(firestore, 'users', res?.user?.uid);
            getDoc(userRef).then(async (result) => {
                if (result.exists() == false){
                    let userRef = doc(firestore, 'users', res?.user?.uid);
                    await setDoc(userRef, {
                        balance: 5000,
                        xp: 1,
                        username: username,
                        tag: '',
                        dailyBonus: Timestamp.now()
                    })
                    let privateUserRef = doc(firestore, 'users', res?.user?.uid, 'private', 'information');
                    await setDoc(privateUserRef, {
                        admin: false,
                        email: false
                    })
                    window.location.reload();

                }
            }).catch(() => {
                auth.signOut();
            })
        }).catch(() => {
            auth.signOut();
        })
    }
    
    const signInGoogle = async () => {
        const provider = new GoogleAuthProvider();

        signInWithPopup(auth, provider).then(async (res) => {
            let userRef = doc(firestore, 'users', res?.user?.uid);
            getDoc(userRef).then(async (result) => {
                if (result.exists() == false){
                    let userRef = doc(firestore, 'users', res?.user?.uid);
                    await setDoc(userRef, {
                        balance: 5000,
                        xp: 1,
                        username: username,
                        tag: '',
                        dailyBonus: Timestamp.now()
                    })
                    let privateUserRef = doc(firestore, 'users', res?.user?.uid, 'private', 'information');
                    await setDoc(privateUserRef, {
                        admin: false,
                        email: false
                    })
                    window.location.reload();

                }
            }).catch(() => {
                auth.signOut();
            })
        }).catch(() => {
            auth.signOut();
        })
    }
    
    const SignUp = (e : any) => {
        if (username.length < 3){
            return alert("Please enter username. Minimum length is 3.")
        }
        if (email.length < 5){
            return alert("Please enter email.");
        }
        if (password.length < 5){
            return alert("Please enter password.");
        }
        e.preventDefault();
        createUserWithEmailAndPassword(auth, email, password)
        .then(res => {
            
            let userRef = doc(firestore, 'users', res?.user?.uid);
            setDoc(userRef, {
                balance: 5000,
                xp: 1,
                username: username,
                tag: '',
                dailyBonus: Timestamp.now()
            })
            let privateUserRef = doc(firestore, 'users', res?.user?.uid, 'private', 'information');
            setDoc(privateUserRef, {
                admin: false,
                email: false
            })
            

        }).catch(e => {
            alert(e);
        })
    }
    const keyLogin = (e : any) => {
        if (e.key === 'Enter'){
            SignIn();
        }
    }

    return (
        <div className="auth">
            <span>Login or Register in order to proceed.</span>
            <br/>
            {needRegister && <div>
                <small>Username</small><br/>
                <input placeholder="yourname" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={keyLogin}></input>
            </div>}
            <small>Email</small>
            <input placeholder="youremail@gmail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={keyLogin}></input>
            <small>Password</small>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={keyLogin}></input>
 
            <button style={{marginTop: '10px'}}onClick={needRegister ? SignUp : SignIn}>{needRegister ? "Register" : "Login"}</button>
            <small className="login-register-switch" onClick={() => setNeedRegister(!needRegister)}>{needRegister ? "Have an account?" : "No account yet?"}</small>
            <div className="separator">OR</div>

            <button onClick={signInGoogle}>Sign in with Google</button><br/>
            <button onClick={signInGitHub}>Sign in with GitHub</button>

        </div>
    )
}

export default Auth
