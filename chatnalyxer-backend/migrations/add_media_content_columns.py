"""
Add extracted_content and ai_summary columns to messages table
for storing AI-analyzed media content without saving files.

Revision ID: add_media_content_columns
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    """Add columns for AI-extracted content"""
    # Add extracted_content column for storing full text from PDFs/images
    op.add_column('messages', 
        sa.Column('extracted_content', sa.Text(), nullable=True,
                 comment='Full text extracted from PDF/image via Azure AI')
    )
    
    # Add ai_summary column for AI-generated titles/summaries
    op.add_column('messages',
        sa.Column('ai_summary', sa.String(500), nullable=True,
                 comment='AI-generated title or summary of the content')
    )
    
    print("✅ Added extracted_content and ai_summary columns to messages table")


def downgrade():
    """Remove the columns"""
    op.drop_column('messages', 'ai_summary')
    op.drop_column('messages', 'extracted_content')
    print("✅ Removed extracted_content and ai_summary columns from messages table")
