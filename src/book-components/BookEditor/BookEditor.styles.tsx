import styled from 'styled-components';

export const BookEditorContainer = styled.div`
    width: 100%;
`;

export const BookEditorWrapper = styled.div<{ fontClassName?: string }>`
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid rgba(209, 213, 219, 0.8);
    background-color: white;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s ease-in-out;
    font-family: ${(props) => props.fontClassName || 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'};
    &:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    &:focus-within {
        outline: 2px solid transparent;
        outline-offset: 2px;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
    }
`;

export const BookEditorBackground = styled.div`
    pointer-events: none;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
`;

export const BookEditorHighlight = styled.pre<{ lineHeight: number; fontClassName?: string }>`
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: auto;
    pointer-events: none;
    white-space: pre-wrap;
    color: rgb(17, 24, 39);
    font-size: 1.125rem;
    padding-top: 0;
    padding-left: 46px;
    padding-right: 46px;
    z-index: 10;
    overflow-wrap: break-word;
    scrollbar-width: none;
    -ms-overflow-style: none;
    line-height: ${(props) => props.lineHeight}px;
    background-image: linear-gradient(90deg, transparent 30px, rgba(59,130,246,0.3) 30px, rgba(59,130,246,0.3) 31px, transparent 31px), repeating-linear-gradient(0deg, transparent, transparent calc(${(props) => props.lineHeight}px - 1px), rgba(0,0,0,0.06) ${(props) => props.lineHeight}px);
    background-attachment: local;
    background-origin: padding-box, content-box;
    background-clip: padding-box, content-box;
    &::-webkit-scrollbar {
        display: none;
    }
    .text-indigo-700 {
        color: rgb(67, 56, 202);
    }
    font-family: ${(props) => props.fontClassName || 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'};
`;

export const BookEditorTextarea = styled.textarea<{ lineHeight: number; fontClassName?: string }>`
    position: relative;
    z-index: 20;
    width: 100%;
    height: 28rem;
    color: transparent;
    caret-color: rgb(17, 24, 39);
    font-size: 1.125rem;
    background-color: transparent;
    outline: none;
    resize: none;
    padding-top: 15px;
    padding-left: 46px;
    padding-right: 46px;
    border: none;
    line-height: ${(props) => props.lineHeight}px;
    font-family: ${(props) => props.fontClassName || 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'};
    &::selection {
        background-color: rgba(99, 102, 241, 0.6);
    }
`;

export const BookEditorVersion = styled.div`
    font-size: 0.875rem;
    color: rgba(17, 24, 39, 0.6);
    padding: 0.5rem 1rem;
    border-top: 1px solid rgba(209, 213, 219, 0.8);
    background-color: rgba(99, 102, 241, 0.1);
    a {
        color: unset;
        text-decoration: none;
    }
`;
