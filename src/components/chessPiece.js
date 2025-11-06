import React from 'react';
import "./chessPiece.css";
import { useDrag, DragPreviewImage } from 'react-dnd';
import { useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';

export function ChessPiece({index, team, piece}){

    let imgRef = team + piece + ".png";

    const [{isDragging}, drag, preview] = useDrag(() => ({
        type : "chessPiece",
        item: { pos:index, team:team, piece:piece },
        collect: (monitor) => ({
            isDragging : !!monitor.isDragging()
        })
      }))    

    return(
        <>
        <DragPreviewImage connect={preview} src = {window.location.origin + "/images/emptyImage.png"} />
        
        <div ref = {drag}>
            <img src = {window.location.origin + `/images/${imgRef}`} className = "chessPiece" style = {{width:"min(11vh, 11vw)", opacity: isDragging ? 0 : 1}}/>
        </div>
        
        </>
    );
}
