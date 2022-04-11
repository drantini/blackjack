import { firestore, auth } from './firebase';
import {useState} from 'react';
import { getDoc, doc, setDoc, updateDoc, increment, Timestamp } from '@firebase/firestore';

export async function getUser(uid : string){
    return new Promise<any>((resolve, reject) => {
        const userRef = doc(firestore, 'users', uid);
        getDoc(userRef).then((res) => {
            resolve(res);
        }).catch((err) => {
            reject(err);
        })
    })
}
export async function updateUser(uid : string, data : any){
    return new Promise<any>((resolve, reject) => {
        const userRef = doc(firestore, 'users', uid);
        updateDoc(userRef, data).then((res) => {
            resolve(res);
        }).catch((err) => {
            reject(err);
        })
    })
}
export async function userWin(uid : string, amount : number){
    return new Promise<any>((resolve, reject) => { 
        updateUser(uid, {
            balance: increment(amount),
            xp: increment(amount/10)
        }).then((res) => {
            resolve(res);
        }).catch((err) => {
            reject(err);
        })
    })
}